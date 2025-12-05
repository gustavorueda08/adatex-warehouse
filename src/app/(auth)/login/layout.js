import { UserProvider } from "@/lib/contexts/UserContext";
import "../../globals.css";
export const metadata = {
  title: "Login",
  description: "Adatex Login",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
