interface HeaderNavigationLink {
  id: string
  label: string
  href: string
}

interface SiteHeaderProps {
  navigationLinks?: HeaderNavigationLink[]
  actionLabel?: string
  actionHref?: string
}
