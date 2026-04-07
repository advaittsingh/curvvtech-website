import {
  chakra,
  Flex,
  HTMLChakraProps,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

export const BRAND_NAME = 'FOLLOWUP'

export const Logo: React.FC<HTMLChakraProps<'div'>> = (props) => {
  const color = useColorModeValue('#231f20', '#fff')
  return (
    <Flex alignItems="center" gap={2} height="32px" {...props}>
      <chakra.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="15 14 105 125"
        width="28px"
        height="28px"
        flexShrink={0}
      >
        <path
          fill="#8952e0"
          d="M117.67 16.59h-54c-1.86 0-3.36 1.5-3.36 3.36V46.2c0 2.11-.89 4.11-2.46 5.52l-.1.09a7.438 7.438 0 0 1-4.96 1.9H20.24c-1.86 0-3.36 1.5-3.36 3.36v38.44c0 1.86 1.5 3.36 3.36 3.36h34.51c1.86 0 3.36-1.5 3.36-3.36V59.25c0-2.11.89-4.11 2.46-5.52a7.438 7.438 0 0 1 4.96-1.9h52.15c1.86 0 3.36-1.5 3.36-3.36V19.95a3.37 3.37 0 0 0-3.37-3.36z"
        />
        <path
          fill="#8952e0"
          d="M117.67 72.78h-34.5c-1.86 0-3.36 1.5-3.36 3.36v36.27c0 2.11-.89 4.11-2.46 5.52a7.438 7.438 0 0 1-4.96 1.9H20.24c-1.86 0-3.36 1.5-3.36 3.36v28.56c0 1.86 1.5 3.36 3.36 3.36h54c1.86 0 3.36-1.5 3.36-3.36v-26.3c0-2.11.89-4.11 2.46-5.52l.1-.09a7.438 7.438 0 0 1 4.96-1.9h32.54c1.86 0 3.36-1.5 3.36-3.36V76.13a3.337 3.337 0 0 0-3.35-3.35z"
        />
      </chakra.svg>
      <Text
        as="span"
        fontWeight="bold"
        fontSize="md"
        letterSpacing="0.06em"
        color={color}
        lineHeight="1"
      >
        {BRAND_NAME}
      </Text>
    </Flex>
  )
}
