import { UserProvider } from "@/lib/contexts/UserContext";
import "../../globals.css";
export const metadata = {
  title: "Login",
  description: "Adatex Login",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
