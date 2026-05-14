import './styles.css'

const defaultNavigationLinks: HeaderNavigationLink[] = [
  { id: 'about', label: 'About', href: '#about' },
  { id: 'services', label: 'Services', href: '#services' },
  { id: 'fee-estimator', label: 'Fee Estimator', href: '#fee-estimator' },
  { id: 'foreign-agents', label: 'For Foreign Agents', href: '#foreign-agents' },
  { id: 'faq', label: 'FAQ', href: '#faq' },
]

function SiteHeader({
  navigationLinks = defaultNavigationLinks,
  actionLabel = 'Get in Touch',
  actionHref = '#contact',
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="site-header__brand" href="/" aria-label="Carbon Patent Group home">
        <img className="site-header__brand-mark" src="/favicon.png" alt="" aria-hidden="true" />
        <span className="site-header__brand-name">Carbon Patent Group</span>
      </a>

      <nav className="site-header__navigation" aria-label="Primary navigation">
        {navigationLinks.map((navigationLink) => (
          <a
            key={navigationLink.id}
            className="site-header__navigation-link"
            href={navigationLink.href}
          >
            {navigationLink.label}
          </a>
        ))}
      </nav>

      <a className="site-header__action" href={actionHref}>
        {actionLabel}
      </a>
    </header>
  )
}

export default SiteHeader
