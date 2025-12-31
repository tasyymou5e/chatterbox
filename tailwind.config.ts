import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					hover: 'hsl(var(--accent-hover))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'large': 'var(--shadow-large)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
			'celebration-fall': {
				'0%': {
					transform: 'translateY(-100%) rotate(0deg)',
					opacity: '1'
				},
				'100%': {
					transform: 'translateY(100vh) rotate(720deg)',
					opacity: '0'
				}
			},
			'star-twinkle': {
				'0%, 100%': { opacity: '1', transform: 'scale(1)' },
				'50%': { opacity: '0.7', transform: 'scale(1.1)' }
			},
			'moon-pulse': {
				'0%, 100%': { boxShadow: '0 0 20px rgba(255, 248, 220, 0.5)' },
				'50%': { boxShadow: '0 0 40px rgba(255, 248, 220, 0.9)' }
			},
			'star-burst-explode': {
				'0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '1' },
				'50%': { transform: 'translate(calc(-50% + cos(var(--angle)) * var(--distance)), calc(-50% + sin(var(--angle)) * var(--distance))) scale(1)', opacity: '1' },
				'100%': { transform: 'translate(calc(-50% + cos(var(--angle)) * var(--distance) * 1.5), calc(-50% + sin(var(--angle)) * var(--distance) * 1.5)) scale(0)', opacity: '0' }
			},
			'firework-launch': {
				'0%': { transform: 'translateY(100%)', opacity: '1' },
				'80%': { transform: 'translateY(0)', opacity: '1' },
				'100%': { transform: 'translateY(0)', opacity: '0' }
			},
			'firework-explode': {
				'0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '1' },
				'100%': { transform: 'translate(calc(-50% + cos(var(--angle)) * var(--distance)), calc(-50% + sin(var(--angle)) * var(--distance))) scale(0)', opacity: '0' }
			},
			'shimmer': {
				'0%': { transform: 'translateX(-100%)' },
				'100%': { transform: 'translateX(100%)' }
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'celebration-fall': 'celebration-fall 2s ease-in forwards',
			'star-twinkle': 'star-twinkle 2s ease-in-out infinite',
			'moon-pulse': 'moon-pulse 2s ease-in-out infinite',
			'star-burst-explode': 'star-burst-explode 0.8s ease-out forwards',
			'firework-launch': 'firework-launch 0.6s ease-out forwards',
			'firework-explode': 'firework-explode 1.2s ease-out forwards',
			'shimmer': 'shimmer 2s infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
