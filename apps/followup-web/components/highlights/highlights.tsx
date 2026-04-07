import {
  Box,
  Card,
  CardProps,
  Grid,
  GridItem,
  GridItemProps,
  Heading,
  useTheme,
} from '@chakra-ui/react'
import { transparentize } from '@chakra-ui/theme-tools'

import { Section, SectionProps } from '#components/section'
import { Testimonial, TestimonialProps } from '#components/testimonials'

export interface HighlightBoxProps
  extends GridItemProps,
    Omit<CardProps, 'title'> {}

export const HighlightsItem: React.FC<HighlightBoxProps> = (props) => {
  const { children, title, ...rest } = props
  return (
    <GridItem
      as={Card}
      borderRadius="md"
      p="8"
      flex="1 0"
      alignItems="flex-start"
      spacing="8"
      overflow="hidden"
      position="relative"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      {...rest}
    >
      {title && (
        <Heading fontSize="3xl" mb="8">
          {title}
        </Heading>
      )}
      {children}
    </GridItem>
  )
}

export const HighlightsTestimonialItem: React.FC<
  HighlightBoxProps &
    TestimonialProps & {
      gradient: [string, string]
      /** Use dark text when the gradient is light (e.g. pastel). */
      readableOnLight?: boolean
    }
> = (props) => {
  const {
    name,
    description,
    avatar,
    children,
    gradient = ['primary.500', 'secondary.500'],
    readableOnLight = false,
    ...rest
  } = props
  const theme = useTheme()
  const onLight = readableOnLight
  return (
    <HighlightsItem
      justifyContent="center"
      _dark={{ borderColor: 'whiteAlpha.300' }}
      p="4"
      {...rest}
    >
      <Box
        bgGradient={`linear(to-br, ${transparentize(
          gradient[0],
          0.8,
        )(theme)}, ${transparentize(gradient[1], 0.8)(theme)})`}
        opacity="1"
        position="absolute"
        inset="0px"
        pointerEvents="none"
        zIndex="0"
        _dark={{ opacity: 0.5, filter: 'blur(50px)' }}
      />
      <Testimonial
        name={name}
        description={
          <Box
            as="span"
            color={onLight ? 'gray.700' : 'whiteAlpha.700'}
            _dark={onLight ? { color: 'gray.700' } : undefined}
          >
            {description}
          </Box>
        }
        avatar={avatar}
        border="0"
        bg="transparent"
        boxShadow="none"
        color={onLight ? 'gray.900' : 'white'}
        position="relative"
        sx={
          onLight
            ? {
                '& .chakra-heading': {
                  color: 'gray.900',
                },
                '& .chakra-card__header .chakra-text': {
                  color: 'gray.700',
                },
                '& .chakra-card__body': {
                  color: 'gray.800',
                },
                _dark: {
                  color: 'gray.900',
                  '& .chakra-heading': { color: 'gray.900' },
                  '& .chakra-card__header .chakra-text': {
                    color: 'gray.700',
                  },
                  '& .chakra-card__body': { color: 'gray.800' },
                },
              }
            : undefined
        }
      >
        {children}
      </Testimonial>
    </HighlightsItem>
  )
}

export const Highlights: React.FC<SectionProps> = (props) => {
  const { children, ...rest } = props

  return (
    <Section
      innerWidth="container.xl"
      position="relative"
      overflow="hidden"
      {...rest}
    >
      <Grid
        templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gap={8}
        position="relative"
      >
        {children}
      </Grid>
    </Section>
  )
}
