# Supabase Auth0 Integration

This directory contains the SQL setup needed to configure Supabase Row Level Security (RLS) with Auth0 JWT authentication.

## Overview

The integration allows:
- Public read access to all data
- Write operations (insert, update, delete) restricted to admin users only
- Admin users are identified by their email addresses in Auth0

## Setup Instructions

1. Run the `auth0_jwt_setup.sql` script in your Supabase SQL editor
2. Configure your Supabase JWT settings to accept Auth0 JWTs:
   - In Supabase Dashboard, go to Authentication > JWT Settings
   - Set JWT Secret to your Auth0 client secret
   - Configure the JWT URL to be: `https://pubs-in-the-sun.uk.auth0.com/.well-known/jwks.json`

## Usage in Frontend

Use the `useSupabaseAuth` hook from `src/_shared/hooks/useSupabase.tsx` to get an authenticated Supabase client:

```tsx
import { useSupabaseAuth } from "../_shared/hooks/useSupabase";

function MyComponent() {
  const { client, isAdmin } = useSupabaseAuth();
  
  const handleUpdateData = async () => {
    // This will only work if the user is an admin
    const { data, error } = await client
      .from('pubs')
      .update({ name: 'Updated Pub Name' })
      .eq('id', 123);
      
    if (error) console.error('Error updating data:', error);
  };
  
  return (
    <div>
      {isAdmin ? (
        <button onClick={handleUpdateData}>Update Data</button>
      ) : (
        <p>You need admin access to modify data</p>
      )}
    </div>
  );
}
```

## How It Works

1. The `useSupabaseAuth` hook gets the JWT token from Auth0
2. It creates a new Supabase client with the JWT token in the Authorization header
3. When requests are made to Supabase, the JWT is validated
4. Supabase RLS policies check if the user is an admin based on their email
5. Operations are allowed or denied based on the policies
