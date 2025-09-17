import './globals.css'

export const metadata = {
  title: 'Speed Test',
  description: 'NekoProof SpeedTest Service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}