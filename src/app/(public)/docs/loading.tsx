import { Spin } from 'antd';

export default function DocsLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" description="Loading documentation..." />
    </div>
  );
}
