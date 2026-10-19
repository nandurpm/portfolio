import { useEffect, useState } from 'react';

export function usePhone() {
  const [phone, setPhone] = useState(() => matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)');
    const update = () => setPhone(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return phone;
}
