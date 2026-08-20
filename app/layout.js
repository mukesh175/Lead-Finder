import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata = {
  title: "LeadFinder - Turn any keyword into qualified leads",
  description:
    "LeadFinder discovers relevant businesses and publicly available contact information from across the web, scores them and exports them to CSV.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
