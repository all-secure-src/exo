import React from 'react';

interface UserMessageComponentProps {
  message: string;
}

const UserMessageComponent: React.FC<UserMessageComponentProps> = ({ message }) => {
  return (
    <div className="dark:bg-slate-800 bg-white-100 shadow-lg rounded-lg p-4 mt-4">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold flex-grow dark:text-white text-black">{message}</h2>
      </div>
    </div>
  );
};

export default UserMessageComponent;