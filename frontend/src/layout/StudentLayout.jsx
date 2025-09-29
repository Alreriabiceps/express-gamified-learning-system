import React from "react";
import { Outlet } from "react-router-dom";
import GameNavbar from "../users/students/components/GameNavbar";

const StudentLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <GameNavbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
