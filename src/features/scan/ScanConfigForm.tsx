'use client';

import { Select, Switch, Typography, Divider, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { TRANSITION } from '@/commons/constants/layout';

const { Text } = Typography;

interface Scanner {
  value: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
}

interface ScanConfigFormProps {
  scanners: Scanner[];
  selectedScanners: string[];
  branch: string;
  providerLabel: string | undefined;
  onToggleScanner: (scanner: string) => void;
}

export function ScanConfigForm({
  scanners,
  selectedScanners,
  branch,
  providerLabel,
  onToggleScanner,
}: ScanConfigFormProps) {
  const { token } = theme.useToken();

  return (
    <>
      <Select
        showSearch
        placeholder="Search branches..."
        options={[
          { value: 'main', label: 'main' },
          { value: 'develop', label: 'develop' },
          { value: 'release', label: 'release' },
        ]}
        style={{ width: '100%' }}
        value={branch}
        filterOption={(input, option) =>
          (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
        }
      />
      <Text
        type="secondary"
        style={{
          fontSize: token.fontSizeSM,
          marginTop: -token.paddingSM,
          display: 'block',
        }}
      >
        {providerLabel} branch list • auto-detected from repository
      </Text>

      <div
        role="group"
        aria-label="Scanner selection"
        style={{ display: 'grid', gap: token.paddingSM }}
      >
        {scanners.map((s) => (
          <button
            key={s.value}
            type="button"
            role="checkbox"
            aria-checked={selectedScanners.includes(s.value)}
            onClick={() => onToggleScanner(s.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: token.paddingMD,
              padding: `${token.paddingMD}px ${token.paddingLG}px`,
              borderRadius: token.borderRadiusLG,
              border: selectedScanners.includes(s.value)
                ? `2px solid ${s.color}`
                : `1px solid ${token.colorBorderSecondary}`,
              background: selectedScanners.includes(s.value)
                ? `${s.color}11`
                : token.colorBgContainer,
              cursor: 'pointer',
              textAlign: 'left',
              transition: `all ${TRANSITION.FAST}`,
            }}
          >
            <Flex align="center" gap={token.paddingMD}>
              <FaIcon
                icon={s.icon}
                style={{
                  color: selectedScanners.includes(s.value) ? s.color : token.colorTextSecondary,
                  fontSize: token.fontSizeLG,
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: token.fontWeightStrong,
                    fontSize: token.fontSize,
                    color: selectedScanners.includes(s.value) ? s.color : token.colorText,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: token.fontSize,
                    color: token.colorTextSecondary,
                    marginTop: 2,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            </Flex>
            {selectedScanners.includes(s.value) && (
              <FaIcon
                icon="fa-check-circle"
                style={{ color: s.color, fontSize: token.fontSizeLG }}
              />
            )}
          </button>
        ))}
      </div>
      {selectedScanners.length === 0 && (
        <Text
          type="secondary"
          style={{
            fontSize: token.fontSize,
            marginTop: -token.paddingSM,
            marginBottom: token.paddingMD,
            display: 'block',
          }}
        >
          Select at least one scanner to proceed.
        </Text>
      )}

      <Divider style={{ margin: `${token.marginXXS}px 0` }} />

      <Flex justify="space-between" align="center">
        <div>
          <div
            style={{
              fontWeight: token.fontWeightStrong,
              fontSize: token.fontSize,
              color: token.colorText,
            }}
          >
            Run immediately
          </div>
          <Text type="secondary" style={{ fontSize: token.fontSize }}>
            Scan will start as soon as you confirm
          </Text>
        </div>
        <Switch checked disabled />
      </Flex>
    </>
  );
}
