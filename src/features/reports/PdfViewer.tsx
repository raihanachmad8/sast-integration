'use client';

import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button, Spin, Typography, theme } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  data: ArrayBuffer;
}

export default function PdfViewer({ data }: PdfViewerProps) {
  const { token } = theme.useToken();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const file = useMemo(() => {
    const copy = data.slice(0);
    return { data: copy };
  }, [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: token.colorFill, minHeight: 420, borderRadius: token.borderRadius, overflow: 'hidden' }}>
      {numPages > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: token.paddingXS, padding: `${token.paddingXS}px ${token.paddingSM}px`, background: token.colorFillSecondary, width: '100%', justifyContent: 'center' }}>
          <Button
            size="small"
            type="text"
            icon={<LeftOutlined />}
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            style={{ color: token.colorTextLightSolid }}
          />
          <Typography.Text style={{ color: token.colorTextLightSolid, fontSize: token.fontSize }}>
            Halaman {pageNumber} / {numPages}
          </Typography.Text>
          <Button
            size="small"
            type="text"
            icon={<RightOutlined />}
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            style={{ color: token.colorTextLightSolid }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 8, width: '100%' }}>
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 360 }}><Spin description="Memuat PDF..." /></div>}
          error={<div style={{ padding: 32, textAlign: 'center', color: token.colorTextLightSolid }}>Gagal memuat PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={Math.min(800, 820)}
          />
        </Document>
      </div>
    </div>
  );
}
