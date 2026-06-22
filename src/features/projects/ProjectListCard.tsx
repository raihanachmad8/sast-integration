'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Space, Table, Tag, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorBanner } from '@/commons/components/ErrorBanner';

const { Text } = Typography;

interface Project {
  id: string;
  name: string | null;
  slug: string | null;
  createdAt?: string | null;
}

interface ProjectListCardProps {
  projects: Project[] | undefined;
  isLoading: boolean;
  isError: boolean;
  workspaceSlug: string;
}

export function ProjectListCard({ projects, isLoading, isError, workspaceSlug }: ProjectListCardProps) {
  const { token } = theme.useToken();
  const router = useRouter();

  if (isLoading) return <LoadingState text="Loading projects..." />;
  if (isError) return <ErrorBanner message="Failed to load projects" />;

  return (
    <>
      <Card>
        <Table
          rowKey="id"
          dataSource={projects || []}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Project',
              dataIndex: 'name',
              render: (name, p: Project) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{name || p.slug || p.id}</Text>
                  {p.slug && <Text type="secondary" style={{ fontSize: token.fontSize }}>{p.slug}</Text>}
                </Space>
              ),
            },
            {
              title: 'Repositories',
              render: () => <Tag>Open Scan Management</Tag>,
            },
            {
              title: 'Actions',
              align: 'right',
              render: () => (
                <Flex justify="flex-end" gap={token.paddingSM}>
                  <Button size="small" onClick={() => router.push(`/${workspaceSlug}/scan`)}>
                    <FaIcon icon="fa-eye" /> Scan Management
                  </Button>
                  <Button size="small" onClick={() => router.push(`/${workspaceSlug}/repositories`)}>
                    View Repos &amp; Policies
                  </Button>
                </Flex>
              ),
            },
          ]}
        />
      </Card>
      <Text type="secondary" style={{ fontSize: token.fontSize, marginTop: token.paddingXL, display: 'block' }}>
        For detailed per-repository policy attachment and run controls, use Scan Management or open a specific repository detail page.
      </Text>
    </>
  );
}
