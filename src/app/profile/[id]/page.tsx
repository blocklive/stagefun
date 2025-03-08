"use client";

// Import the ProfilePage component from the parent directory
import ProfilePage from "../page";

// This is a dynamic route that will render the same ProfilePage component
// The [id] parameter will be passed to the component via useParams
export default function UserProfilePage() {
  return <ProfilePage />;
}
