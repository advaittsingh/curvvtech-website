'use client'
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const OFFSET = 80

const HeaderLink: React.FC<{ item: any }> = ({ item }) => {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash)
    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [pathname])

  useEffect(() => {
    if (!window.location.hash) return
    const id = window.location.hash.substring(1)
    const element = document.getElementById(id)
    if (!element) return
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: elementPosition - OFFSET, behavior: 'smooth' })
  }, [pathname, hash])

  const activeLink = hash ? `${pathname}${hash}` : pathname
  const isActive =
    activeLink === item.href ||
    (item.href !== '/' && activeLink.startsWith(`${item.href}/`))

  return (
    <li>
      <Link
        href={item.href}
        className={`px-4 py-2 font-medium hover:text-black dark:hover:text-black hover:bg-white hover:rounded-3xl hover:shadow-header_shadow 
                    ${
                      isActive
                        ? 'bg-white text-black rounded-[90rem] shadow-header_shadow'
                        : 'text-dark_black/60 dark:text-white'
                    }`}
      >
        {item.label}
      </Link>
    </li>
  )
}

export default HeaderLink
