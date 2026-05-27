'use client';
import { Button, Layout } from 'antd';
import Link from 'next/link';

export function PublicNavbar() {
  return (
    <Layout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>SAST</span>
      <Link href="/login"><Button type="primary">Login</Button></Link>
    </Layout.Header>
  );
}