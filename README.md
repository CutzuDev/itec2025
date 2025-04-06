# StudentHub

<div align="center">
  <img src="public/study_group.svg" alt="StudentHub Logo" width="200" />
  <h3>Transform Your Study Experience</h3>
  <p>A modern platform for students to connect, share resources, and study together</p>
</div>

## 📚 Overview

StudentHub is a comprehensive platform designed to enhance the academic experience by fostering collaboration among students. It provides a set of integrated tools for organizing study sessions, sharing curriculum materials, creating podcast-like audio content, and real-time discussions in chat rooms.

The application is built with Next.js 15 and uses Supabase for authentication, database, and file storage functionality.

## ✨ Features

### 🗓️ Study Sessions
- Create and manage study events with dates, times, and locations
- Join existing study groups and track participation
- View upcoming and past sessions in an organized calendar

### 📝 Curriculum Management
- Upload PDF documents for AI-powered summarization
- Store and organize study materials
- Share curricula with study groups
- Access summaries and original documents anytime

### 🎧 Audio Content
- Generate text-to-speech from curriculum content
- Listen to summaries and study materials
- Built-in audio player with playback controls

### 💬 Chatrooms
- Real-time discussion for each study group
- Share messages, files, and emojis
- View participant information and session details

### 👤 User Profile & Settings
- Customize profile information
- Manage notification preferences
- Review participation history

## 🔧 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, Lucide React icons
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## 📁 Project Structure

```
studenthub/
├── app/                  # Next.js App Router structure
│   ├── (auth-pages)/     # Authentication pages (sign-in, sign-up)
│   ├── (dashboard)/      # Main application views
│   │   ├── calendar/     # Event calendar and management
│   │   ├── chatrooms/    # Real-time discussion rooms
│   │   ├── curricula/    # Study materials listing and management
│   │   ├── podcasts/     # Audio content listing
│   │   ├── sessions/     # Study group session details
│   │   ├── settings/     # User preferences
│   │   └── summaries/    # PDF upload and summarization
│   ├── api/              # API routes for processing
│   │   ├── process-pdf/  # PDF processing and summarization
│   │   └── tts/          # Text-to-speech conversion
│   └── layout.tsx        # Root layout with theme provider
├── components/           # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── ui/               # UI design system components
│   ├── audio-player.tsx  # Audio playback component
│   ├── chat-input.tsx    # Chat message input
│   └── chat-messages.tsx # Chat message display
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and shared logic
└── utils/                # Helper functions and Supabase client
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or bun 1.2+
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/studenthub.git
   cd studenthub
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Database Schema

The application uses the following main database tables:

- **users**: User profiles and authentication
- **events**: Study sessions with details (time, location, etc.)
- **event_participants**: Many-to-many relationship for event participation
- **curricula**: Study materials and summaries
- **curricula_events**: Association between study materials and events
- **chat_messages**: Real-time messages for study groups

## 🔒 Authentication

StudentHub uses Supabase Authentication with email/password login. The auth flow includes:

- Sign up with email verification
- Secure login with session management
- Password reset functionality
- Protected routes for authenticated users

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile devices

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
