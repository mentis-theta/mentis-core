import { useLocation, matchPath } from 'react-router-dom';

export const useSelectedPatientId = (): string | null => {
  const location = useLocation();
  
  const patientMatch = matchPath({ path: "/patients/:patientId" }, location.pathname);
  if (patientMatch?.params.patientId && patientMatch.params.patientId !== 'requests') {
    return patientMatch.params.patientId;
  }

  const requestMatch = matchPath({ path: "/patients/requests/:patientId" }, location.pathname);
  if (requestMatch?.params.patientId) {
    return requestMatch.params.patientId;
  }

  return null;
};
