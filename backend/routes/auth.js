const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail, sendSignInEmail, sendOTPEmail, sendPasswordResetConfirmationEmail } = require('../services/emailService');
const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// OAuth callback handler
router.post('/oauth/callback', async (req, res) => {
  try {
    const { user, session } = req.body;
    const supabase = req.app.get('supabase');

    if (!user || !session) {
      return res.status(400).json({ message: 'Invalid OAuth data' });
    }

    console.log('OAuth user data:', user);

    // Check if user exists in our database
    let { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (findError) {
      console.error('Error finding user:', findError);
    }

    if (!existingUser) {
      // Extract name from user metadata
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const nameParts = fullName.split(' ');
      const firstName = user.user_metadata?.first_name || nameParts[0] || '';
      const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(' ') || '';

      // Create new user from OAuth data
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          profile_picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          oauth_provider: user.app_metadata?.provider,
          oauth_id: user.id,
          is_premium: false
        }])
        .select()
        .single();

      if (error) {
        console.error('User creation error:', error);
        throw error;
      }
      existingUser = newUser;
      console.log('Created new OAuth user:', existingUser.id);
    } else {
      console.log('Found existing OAuth user:', existingUser.id);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: existingUser.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        profilePicture: existingUser.profile_picture,
        is_premium: existingUser.is_premium
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    console.log('Registration attempt:', { email, firstName, lastName });
    
    if (!email || !password || !firstName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const supabase = req.app.get('supabase');

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName || '',
        is_premium: false
      })
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      throw error;
    }

    console.log('User created successfully:', user.id);

    // Send welcome email
    sendWelcomeEmail(user.email, user.first_name);

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        is_premium: user.is_premium
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Check for hardcoded admin account
    if (email === 'euforia.admin.2024@gmail.com' && password === 'EuforiaSecure#2024') {
      const token = jwt.sign(
        { id: 'admin', role: 'admin' },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: 'admin',
          email: 'euforia.admin.2024@gmail.com',
          firstName: 'Admin',
          lastName: 'User',
          is_premium: true,
          is_admin: true
        }
      });
    }

    const supabase = req.app.get('supabase');

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Login query error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    if (!user.password_hash) {
      console.log('No password hash for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('Login successful for user:', user.id);

    // Send sign-in email
    sendSignInEmail(user.email, user.first_name);

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        is_premium: user.is_premium,
        is_admin: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
});

// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const supabase = req.app.get('supabase');

    // Check if user exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('first_name')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error finding user:', error);
    }

    if (!user) {
      return res.status(400).json({ message: 'No account found with this email address' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000
    });

    // Send OTP email
    await sendOTPEmail(email, user.first_name, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Verify OTP was validated (check if still in store)
    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'Invalid reset session' });
    }

    const supabase = req.app.get('supabase');

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    const { data: user, error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email)
      .select('first_name')
      .single();

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }

    // Clear OTP from store
    otpStore.delete(email);

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(email, user.first_name);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

module.exports = router;