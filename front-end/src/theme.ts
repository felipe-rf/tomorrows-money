import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  primaryColor: "primary",
  colors: {
    primary: [
      "#f0f9f5", // 0 - lightest (very light green)
      "#d9f0e3", // 1
      "#b8e6cb", // 2
      "#96dcb3", // 3
      "#74d29b", // 4
      "#52b788", // 5 - main color from CSS
      "#498467", // 6 - primary-dark from CSS
      "#3f7059", // 7
      "#355c4b", // 8
      "#2b483d", // 9 - darkest
    ],
    dark: [
      "#f5f3f4", // 0 - lightest
      "#e8e4e6", // 1
      "#d4cdd1", // 2
      "#c0b5bc", // 3
      "#ac9ea7", // 4
      "#988692", // 5
      "#846f7d", // 6
      "#705768", // 7
      "#5c4053", // 8
      "#592941", // 9 - main dark color from CSS
    ],
    accent: [
      "#fdfcf7", // 0 - lightest
      "#fbf8ee", // 1
      "#f8f4e4", // 2
      "#f4efda", // 3
      "#f1ead0", // 4
      "#ede5a6", // 5 - main accent color from CSS
      "#d4c995", // 6
      "#bbad84", // 7
      "#a29173", // 8
      "#897562", // 9 - darkest
    ],
  },
  // Set default color scheme
  colorScheme: "light",

  // Font settings
  fontFamily: "Inter, system-ui, sans-serif",
  headings: { fontFamily: "Inter, system-ui, sans-serif" },

  // Component customizations
  components: {
    Button: {
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.primary[5], // #52b788
          color: "white",
          "&:hover": {
            backgroundColor: theme.colors.primary[6], // #498467
          },
          "&:active": {
            backgroundColor: theme.colors.primary[7],
          },
        },
      }),
      variants: {
        // Primary button variant
        primary: (theme: any) => ({
          root: {
            backgroundColor: theme.colors.primary[5],
            color: "white",
            "&:hover": {
              backgroundColor: theme.colors.primary[6],
            },
          },
        }),
        // Secondary button variant with accent color
        accent: (theme: any) => ({
          root: {
            backgroundColor: theme.colors.accent[5],
            color: theme.colors.dark[9],
            "&:hover": {
              backgroundColor: theme.colors.accent[6],
            },
          },
        }),
        // Dark button variant
        dark: (theme: any) => ({
          root: {
            backgroundColor: theme.colors.dark[9],
            color: "white",
            "&:hover": {
              backgroundColor: theme.colors.dark[8],
            },
          },
        }),
      },
    },

    Card: {
      styles: (theme: any) => ({
        root: {
          borderColor: theme.colors.primary[2],
          "&:hover": {
            borderColor: theme.colors.primary[4],
            boxShadow: `0 4px 12px ${theme.colors.primary[1]}`,
          },
        },
      }),
    },

    Input: {
      styles: (theme: any) => ({
        input: {
          borderColor: theme.colors.primary[3],
          "&:focus": {
            borderColor: theme.colors.primary[5],
          },
        },
      }),
    },

    Navbar: {
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.dark[9], // #592941
          borderColor: theme.colors.dark[7],
        },
      }),
    },

    Header: {
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.primary[5], // #52b788
          borderColor: theme.colors.primary[6],
        },
      }),
    },

    Badge: {
      variants: {
        accent: (theme: any) => ({
          root: {
            backgroundColor: theme.colors.accent[5],
            color: theme.colors.dark[9],
          },
        }),
      },
    },

    Progress: {
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.primary[1],
        },
        bar: {
          backgroundColor: theme.colors.primary[5],
        },
      }),
    },

    Notification: {
      styles: (theme: any) => ({
        root: {
          borderLeftColor: theme.colors.primary[5],
        },
      }),
    },
  },

  // Global styles
  globalStyles: (theme: any) => ({
    body: {
      backgroundColor: theme.colors.primary[0],
      color: theme.colors.dark[9],
    },

    // Custom CSS variables for consistency
    ":root": {
      "--color-primary": theme.colors.primary[5], // #52b788
      "--color-dark": theme.colors.dark[9], // #592941
      "--color-primary-dark": theme.colors.primary[6], // #498467
      "--color-accent": theme.colors.accent[5], // #ede5a6
      "--color-gradient": theme.colors.primary[6], // #498467
    },
  }),

  // Spacing and sizing
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },

  // Radius settings
  radius: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },

  // Shadow settings with primary color
  shadows: {
    xs: `0 1px 3px rgba(82, 183, 136, 0.1)`,
    sm: `0 1px 3px rgba(82, 183, 136, 0.12), 0 1px 2px rgba(82, 183, 136, 0.24)`,
    md: `0 3px 6px rgba(82, 183, 136, 0.15), 0 2px 4px rgba(82, 183, 136, 0.12)`,
    lg: `0 10px 25px rgba(82, 183, 136, 0.15), 0 4px 10px rgba(82, 183, 136, 0.08)`,
    xl: `0 20px 40px rgba(82, 183, 136, 0.15), 0 8px 16px rgba(82, 183, 136, 0.1)`,
  },
};
