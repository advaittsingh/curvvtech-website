'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'

export type RevealBoxProps = BoxProps & {
  delay?: number
}

export function RevealBox({
  delay = 0,
  children,
  ...rest
}: RevealBoxProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 28 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: '-72px' },
            transition: {
              duration: 0.55,
              delay,
              ease: [0.22, 1, 0.36, 1],
            },
          })}
      style={{ width: '100%' }}
    >
      <Box {...rest}>{children}</Box>
    </motion.div>
  )
}
