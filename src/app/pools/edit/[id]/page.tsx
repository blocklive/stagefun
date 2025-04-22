"use client";

import React from "react";
import { useParams } from "next/navigation";
import EditPoolForm from "../components/EditPoolForm";

export default function EditPoolPage() {
  const params = useParams();
  const poolIdentifier = params.id as string;

  return <EditPoolForm poolIdentifier={poolIdentifier} />;
}
