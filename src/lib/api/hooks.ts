'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { api, ApiError } from './client';
import type { Query } from './types';

export function useApiQuery<T>(endpoint:string, query:Query = {}, enabled = true, reloadKey:unknown = 0) {
  const {user,status} = useAuth();
  const [revision,setRevision] = useState(0);
  const key = JSON.stringify([endpoint,query,enabled,status,user?.id,user?.permissions,reloadKey,revision]);
  const [result,setResult] = useState<{key:string;data:T|null;error:ApiError|null}>({key:'',data:null,error:null});
  useEffect(() => {
    const [path,parameters,allowed,authStatus] = JSON.parse(key) as [string,Query,boolean,string];
    if (!allowed || authStatus !== 'authenticated') return;
    const controller = new AbortController();
    api.get<T>(path,parameters,controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({key,data,error:null});
    }).catch(error => {
      if (!controller.signal.aborted) setResult({key,data:null,error:error instanceof ApiError ? error : new ApiError('Não foi possível carregar a consulta.')});
    });
    return () => controller.abort();
  },[key]);
  const current = result.key === key;
  return {data:current ? result.data : null, error:current ? result.error : null,
    loading:enabled && status === 'authenticated' && !current,
    reload:() => { setRevision(value => value + 1); }};
}
