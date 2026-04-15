# Firebase Email Verification Setup Checklist

If you're not receiving verification emails, you need to configure these settings in Firebase Console:

## 1. Enable Email/Password Provider
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

## 2. Configure Authorized Domains
1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add your domain (e.g., `localhost` for local development, or your production domain)
5. Common domains to add:
   - `localhost` (for local development)
   - `your-domain.com` (your production domain)
   - `your-project.firebaseapp.com` (Firebase hosting domain)

## 3. Configure Email Templates
1. Go to **Authentication** → **Templates** tab
2. Click on **Email verification** template
3. Configure the following:
   - **Sender name**: Your app name (e.g., "WhoWins")
   - **Reply-to email**: Your support email
   - **Customize action URL**: Enable this
   - **Action URL**: `https://your-domain.com/verify-action`
4. Click **Save**

## 4. Check Email Sending Limits
Firebase has daily email sending limits:
- **Spark Plan (free)**: 100 emails/day
- **Blaze Plan (pay-as-you-go)**: Higher limits

Check if you've exceeded the daily quota.

## 5. Test Configuration
Use the test page at `/test-email` to verify:
1. Go to `http://localhost:3000/test-email` (or your domain)
2. Enter a test email and password
3. Check if you receive the verification email
4. Check spam folder

## 6. Common Issues & Solutions

### Issue: Emails not sending at all
**Solution:**
- Check browser console for errors (F12 → Console)
- Verify Firebase project is properly linked
- Check if email provider is enabled

### Issue: Emails going to spam
**Solution:**
- Check spam folder
- Configure SPF/DKIM records for your domain
- Use a reputable email address for testing

### Issue: Verification link not working
**Solution:**
- Make sure `handleCodeInApp: true` is set
- Verify action URL is correct
- Check that your domain is in authorized domains list

### Issue: "Invalid action code" error
**Solution:**
- Action codes expire after a certain time
- Make sure the link is clicked within the validity period
- Check if the action URL matches what's configured in Firebase

## 7. Debug Steps
1. **Check browser console** for any Firebase errors
2. **Verify Firebase config** matches your project
3. **Test with different email providers** (Gmail, Outlook, etc.)
4. **Check Firebase project logs** in Console
5. **Try without action URL settings** as fallback

## 8. Production Deployment
For production, make sure:
1. Your production domain is in authorized domains
2. Email templates are properly configured
3. SPF/DKIM records are set up for your domain
4. You have sufficient email quota

## 9. Local Development Tips
For local development:
1. Use `localhost` as authorized domain
2. Run on standard port (3000)
3. Check that `NEXT_PUBLIC_FIREBASE_*` environment variables are set
4. Use the test page to verify functionality

## 10. Environment Variables
Make sure these are set in your `.env.local` file:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Need Help?
If you're still having issues:
1. Check Firebase documentation: https://firebase.google.com/docs/auth/web/email-link-auth
2. Look at Firebase project logs
3. Try the Firebase emulator for local testing
4. Contact Firebase support