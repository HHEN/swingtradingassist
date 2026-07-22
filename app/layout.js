export const metadata = {
  title: "Swing-Cockpit",
  description: "Value-Pullback-Framework",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#0E1116" }}>{children}</body>
    </html>
  );
}
