/** Re-mounts on every navigation, which gives each page a soft fade-in. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
