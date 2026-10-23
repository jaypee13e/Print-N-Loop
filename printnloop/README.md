# Print n' Loop: setup in one place

## 1. Database (Supabase > SQL Editor, run each once, in order)
1. database/1-setup.sql      (products, photo storage, admin permissions)
2. database/2-inquiries.sql  (customer inquiry form and admin inbox)
Both already use the admin email jaypeom0@gmail.com.

## 2. Add your key
Open site/script.js, line 26. Replace YOUR-ANON-KEY with the "anon public" key
(Supabase > Project Settings > API Keys > Legacy tab). Keep the quotation marks. Save.
Never use the service_role key.

## 3. Upload to Cloudflare Pages (Workers & Pages > Create > Pages > Upload assets)
Upload ONLY the contents of the site/ folder (index.html, script.js, style.css, _headers,
robots.txt, logo.png, logo-header.png, favicon.png). Do not upload the database folder,
this README, or the wrangler files.

## 4. Test
- Open <your site>/#admin2600 and sign in with your admin email and password.
- First sign-in copies the 17 default products into the database.
- Add a test product, then check it on your phone. Send a test inquiry from the Contact page and
  check it appears in the admin inbox. Delete the tests afterward.

## Security checklist
- Supabase: public sign-ups OFF, anonymous sign-ins OFF.
- Turn on two-factor sign-in for Supabase, Cloudflare and your admin email.

## Before you share the link (launch checklist)
1. Key in site/script.js line 26 is your real anon public key (not YOUR-ANON-KEY).
2. Both SQL files ran with "Success".
3. Admin test passed: add product, see it on your phone, delete it.
4. Inquiry test passed: send one, see it in the admin inbox, delete it.
5. When you have your final address, in index.html change
   <meta property="og:image" content="logo.png"> to
   <meta property="og:image" content="https://YOUR-ADDRESS/logo.png"> and upload again,
   so Facebook and Messenger previews show your logo.
6. Phone card on the Contact page stays hidden until you add a real number (see the comment in index.html).
7. Two-factor sign-in is on for Supabase, Cloudflare and your admin email.
