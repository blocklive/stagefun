"use client";

// Import the ProfileComponent directly
import ProfileComponent from "../components/ProfileComponent";

// This is a dynamic route that will render the ProfileComponent
// The [id] parameter will be passed to the component via useParams
export default function UserProfilePage() {
  return <ProfileComponent />;
}
