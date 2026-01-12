// Demo mode banner component
function DemoBanner() {
  const isDemoMode = localStorage.getItem('mvp_web_mock_data') !== null || 
                     !window.location.hostname.includes('localhost');

  if (!isDemoMode) return null;

  return (
    <div style={{
      background: '#ff9800',
      color: 'white',
      padding: '10px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '500',
    }}>
      🚀 Modo Demo - Usando datos de demostración. Los cambios se guardan localmente.
    </div>
  );
}

export default DemoBanner;
