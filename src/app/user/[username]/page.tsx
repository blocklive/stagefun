"use client";

// Import the ProfileComponent directly
import ProfileComponent from "../../profile/components/ProfileComponent";

// This is a dynamic route that will render the ProfileComponent
// The [username] parameter will be passed to the component via useParams
export default function UserProfileByUsernamePage() {
  return <ProfileComponent isUsernameRoute={true} />;
}
