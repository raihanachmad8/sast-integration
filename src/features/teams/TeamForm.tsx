'use client';

import { useState, useEffect } from 'react';
import { Button, App, Select, Form, Input, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useTeamMembersQuery } from '@/modules/teams';
import type { Team } from '@/commons/types';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface TeamFormProps {
  team?: Team | null;
}

export function TeamForm({ team }: TeamFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [autoSlug, setAutoSlug] = useState(!team);

  const membersQuery = useTeamMembersQuery(team?.id ?? '');
  const memberOptions = (membersQuery.data ?? [])
    .filter((m, i, arr) => arr.findIndex((x) => x.userId === m.userId) === i)
    .map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` }));

  const nameValue = Form.useWatch('name', form);

  useEffect(() => {
    if (team) {
      form.setFieldsValue({ name: team.name, slug: team.slug, description: team.description, memberIds: [] });
      setAutoSlug(false);
    }
  }, [team, form]);

  useEffect(() => {
    if (autoSlug && nameValue) {
      form.setFieldsValue({ slug: slugify(nameValue) });
    }
  }, [nameValue, autoSlug, form]);

  const handleFinish = (values: { name: string; slug: string; description: string; memberIds: string[] }) => {
    message.success(team ? `Team "${values.name}" updated` : `Team "${values.name}" created`);
    router.push('/' + window.location.pathname.split('/')[1] + '/teams');
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ name: '', slug: '', description: '', memberIds: [] }} style={{ display: 'grid', gap: token.paddingXL, maxWidth: 720 }}>
      <Form.Item
        label="Team name"
        name="name"
        rules={[{ required: true, message: 'Team name is required' }]}
      >
        <Input placeholder="e.g. Security Team" />
      </Form.Item>

      <Form.Item
        label="Slug"
        name="slug"
        rules={[{ required: true, message: 'Slug is required' }]}
        extra="Unique identifier for URL paths"
      >
        <Input placeholder="e.g. security-team" onChange={() => setAutoSlug(false)} />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
      >
        <Input.TextArea placeholder="Optional description" rows={3} style={{ resize: 'vertical' }} />
      </Form.Item>

      <Form.Item label="Members" name="memberIds" extra="Members can be added or removed later from the team detail.">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select workspace members to add"
          options={memberOptions}
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>

      <Flex gap={token.paddingMD} style={{ paddingTop: token.paddingLG }}>
        <Button type="primary" htmlType="submit">
          {team ? 'Save team' : 'Create team'}
        </Button>
        <Button onClick={() => router.back()}>
          Cancel
        </Button>
      </Flex>
    </Form>
  );
}
