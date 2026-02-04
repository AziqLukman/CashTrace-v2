import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata = {
  title: 'CashTrace',
  description: 'Kelola keuangan dengan cerdas',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: "#2463eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Inline script to prevent flash of wrong theme
// Login page should always be light mode, theme is per-user
const themeScript = `
  (function() {
    try {
      var isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/forgot-password';
      
      // Always remove dark class first
      document.documentElement.classList.remove('dark');
      
      // Only apply dark theme for authenticated pages (not login/register)
      if (!isLoginPage) {
        var user = localStorage.getItem('user');
        if (user) {
          var parsedUser = JSON.parse(user);
          var userId = parsedUser.id || parsedUser._id;
          var theme = localStorage.getItem('theme_' + userId);
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          }
        }
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background-light dark:bg-background-dark transition-colors">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
