import { Result, Button } from 'antd';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Result
        status="404"
        title="Page Not Found"
        subTitle="The page you are looking for does not exist."
        extra={
          <Link href="/">
            <Button type="primary">Back to Home</Button>
          </Link>
        }
      />
    </div>
  );
}
