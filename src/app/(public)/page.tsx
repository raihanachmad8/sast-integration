'use client';
import { Button, Typography } from 'antd';
import { SecurityScanOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function LandingPage() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <SecurityScanOutlined style={{ fontSize: 64 }} />
      <Title>SAST Integration Platform</Title>
      <Link href="/login">
        <Button type="primary" size="large">Get Started</Button>
      </Link>
    </div>
  );
}
