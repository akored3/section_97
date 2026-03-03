// Authentication module for SECTION-97
import { supabase } from '../config/supabase.js';

// Substrings to reject in generated usernames (case-insensitive check)
const BLOCKED_PATTERNS = [
    'ass', 'cum', 'fag', 'nig', 'rape', 'slut', 'tit', 'wtf', 'dick', 'cock',
    'pussy', 'shit', 'fuck', 'cunt', 'bitch', 'whore', 'nazi', 'porn', 'anal'
];

function isOffensive(username) {
    const lower = username.toLowerCase();
    return BLOCKED_PATTERNS.some(p => lower.includes(p));
}

// Cache for username word pools
let usernameWords = null;

// Generate a unique username from word pools
async function generateUsername() {
    if (!usernameWords) {
        const response = await fetch('./js/data/usernames.json');
        usernameWords = await response.json();
    }
    const data = usernameWords;

    for (let i = 0; i < 5; i++) {
        const first = data.firstWords[Math.floor(Math.random() * data.firstWords.length)];
        const second = data.secondWords[Math.floor(Math.random() * data.secondWords.length)];
        const name = first + second;
        if (!isOffensive(name)) return name;
    }

    // If somehow all 5 attempts were offensive, use a safe fallback
    return 'User' + Date.now().toString(36);
}

// Wait for profile row to be created by database trigger
async function waitForProfile(userId, maxAttempts = 10, delayMs = 300) {
    for (let i = 0; i < maxAttempts; i++) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (data && !error) {
            return true; // Profile exists!
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return false; // Timeout - profile never appeared
}

// Check if username exists, regenerate if needed
async function getUniqueUsername() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const username = await generateUsername();

        // Check if username already exists
        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single();

        if (!data) {
            return username; // Username is available
        }

        attempts++;
    }

    // Fallback: add random suffix and verify uniqueness
    for (let i = 0; i < 5; i++) {
        const base = await generateUsername();
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const suffix = array[0] % 99999;
        const fallback = base + suffix;

        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', fallback)
            .single();

        if (!data) return fallback;
    }

    // Last resort: timestamp-based (practically unique)
    return 'User' + Date.now().toString(36);
}

// Assign a username to a profile that doesn't have one yet
let repairInProgress = null;
async function repairUsername(userId) {
    // Prevent concurrent repairs from generating different usernames
    if (repairInProgress) return repairInProgress;

    repairInProgress = (async () => {
        try {
            const newUsername = await getUniqueUsername();
            const { data: repaired } = await supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', userId)
                .select('username')
                .single();

            return repaired?.username || newUsername;
        } catch (e) {
            console.warn('Failed to repair missing username:', e);
            return null;
        } finally {
            repairInProgress = null;
        }
    })();

    return repairInProgress;
}

// Sign up a new user
export async function signUp(email, password) {
    try {
        // Create the auth user (trigger auto-creates profile row)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;

        // If email confirmation is required, user won't be authenticated yet
        // The session will be null until they confirm their email
        if (!authData.session) {
            return {
                success: true,
                user: authData.user,
                needsConfirmation: true,
                message: 'Account created! Check your email to confirm your account.'
            };
        }

        // No confirmation needed — set up profile immediately
        const profileCreated = await waitForProfile(authData.user.id);
        if (!profileCreated) {
            throw new Error('Profile creation timeout - please try again');
        }

        const username = await getUniqueUsername();
        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update({ username: username })
            .eq('id', authData.user.id)
            .select('username')
            .single();

        if (profileError) throw profileError;
        if (!updatedProfile?.username) {
            console.warn('Profile update returned no data — RLS may be blocking writes');
        }

        return {
            success: true,
            user: authData.user,
            username: username,
            message: `Welcome to SECTION-97, ${username}!`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign in existing user
export async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Get their username
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.user.id)
            .single();

        const username = profile?.username || await repairUsername(data.user.id);

        return {
            success: true,
            user: data.user,
            username,
            message: `Welcome back, ${username}!`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign out
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Get current user
export async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        // Get their profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, total_spent, order_count')
            .eq('id', user.id)
            .single();

        const username = profile?.username || (profile ? await repairUsername(user.id) : null);

        return {
            id: user.id,
            email: user.email,
            username,
            avatar: profile?.avatar_url,
            totalSpent: parseFloat(profile?.total_spent || 0),
            orderCount: profile?.order_count || 0
        };
    } catch (e) {
        console.warn('Failed to get current user:', e);
        return null;
    }
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
