import React from 'react'

const Profile = () => {
  return (
    <div className="profile-container">
      <div style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
          fontFamily: 'system-ui,-apple-system,sans-serif'
        }}>
          Student Profile
        </h1>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <p style={{
            fontSize: '13px',
            color: '#94a3b8',
            fontFamily: 'system-ui,-apple-system,sans-serif'
          }}>
            Profile information is displayed from the AIUB Portal. 
            This component is automatically enhanced by the AIUB+ extension.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Profile
