import "./globals.css";

export const metadata = {
  title: "Customer Churn Analysis",
  description: "Advanced Customer Analytics & Churn Analysis Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
