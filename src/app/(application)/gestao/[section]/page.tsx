import {notFound} from 'next/navigation';
import {WmsDashboard} from '@/features/wms/WmsDashboard';
import {navigation} from '@/features/wms/navigation';
export default async function ManagementPage({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!navigation.some(item=>item.id===section))notFound();return <WmsDashboard section={section}/>;}
