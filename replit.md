# QASHGO Agencies - Affiliate Marketing Platform

## Overview

QASHGO Agencies is a multilingual (French/English) affiliate marketing platform built with React and Vite. The application enables users to earn money through a 3-tier referral system, where users can register, refer others, and receive commissions based on their referral network. The platform targets the African market with localized payment methods and currency (FCFA).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool for fast development and optimized production builds
- **Routing**: React Router DOM for client-side navigation
- **State Management**: React Context API for authentication state management via custom `useAuth` hook
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming, featuring a dark brown/blue color scheme
- **UI Components**: Radix UI primitives for accessible components (dialogs, dropdowns, avatars, etc.) with custom styling
- **Animations**: Framer Motion for smooth UI transitions and interactions
- **Internationalization**: i18next with browser language detection for French/English support

### Component Architecture
- **Design System**: Shadcn/ui pattern with reusable components in `/components/ui/`
- **Utility Functions**: Class variance authority for component styling variants
- **Toast System**: Custom toast implementation for user notifications
- **Form Handling**: Built-in validation for user registration and authentication

### Authentication & User Management
- **Storage**: LocalStorage for client-side user session persistence
- **Password Security**: bcryptjs for password hashing (client-side implementation)
- **User Context**: React Context pattern for global authentication state

### Data Management
- **Database**: Supabase (PostgreSQL) for user data, referrals, and commission tracking
- **Real-time Features**: Supabase client for real-time database operations
- **Data Structure**: Users table with referral relationships and commission tracking

### Referral System Architecture
- **3-Tier Commission Structure**: 
  - Level 1: 1800 FCFA direct referrals
  - Level 2: 900 FCFA second-level referrals  
  - Level 3: 500 FCFA third-level referrals
- **Code Generation**: Username-based referral code system
- **Commission Processing**: Automated commission calculation and distribution
- **Balance Management**: Separate tracking for total balance and withdrawable balance

### Development Tools
- **Visual Editor**: Custom Vite plugins for inline text editing in development mode
- **Code Quality**: ESLint with React-specific rules
- **Build Optimization**: Vite with React plugin for fast HMR and optimized builds
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer

## External Dependencies

### Core Services
- **Supabase**: Primary database and backend-as-a-service
  - Real-time PostgreSQL database
  - Authentication services (though currently using custom implementation)
  - API endpoint: `https://xusroouovvrdaciiqtdq.supabase.co`

### UI Libraries
- **Radix UI**: Comprehensive primitive component library for accessibility
- **Lucide React**: Icon library for consistent iconography
- **Framer Motion**: Animation library for enhanced user experience

### Development Dependencies
- **Babel**: Code transformation for the visual editor plugins
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework with animation extensions

### Content Integration
- **React YouTube**: YouTube video embedding for educational content
- **i18next**: Internationalization framework with browser language detection

### Utility Libraries
- **clsx & tailwind-merge**: CSS class name utilities for dynamic styling
- **bcryptjs**: Client-side password hashing (Note: Should be moved to server-side for security)

### Content & Earning Systems
- **Formations/E-books System**: PDF-only learning materials with URL-based content management
  - Admin uploads via direct URLs (no file storage complications)
  - User downloads earn immediate FCFA rewards added to withdrawable_balance
  - Database tracking via formations and user_formations tables
- **YouTube/TikTok Video System**: Watch-to-earn content with 30-second viewing requirements
  - Separate balance tracking (youtube_balance, tiktok_balance)
  - Conversion to withdrawable_balance when thresholds are met (500 FCFA minimum)

### Recent Changes (Sept 2025)
- **Formations System Simplified**: Switched from file uploads to URL-based PDF and image management to avoid Supabase storage permission issues
- **Download Rewards Update**: Formations download rewards now properly credited to withdrawable_balance instead of general balance, ensuring users can actually withdraw their earnings

The application follows a modern React architecture with emphasis on user experience, accessibility, and internationalization, specifically designed for the African affiliate marketing market.