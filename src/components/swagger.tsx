import React, { useEffect } from 'react';
import SwaggerUi, { presets } from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';

interface Props {
  spec: any;
}

export function SwaggerUI(props: Props) {
  useEffect(() => {
    SwaggerUi({
      dom_id: '#swaggerUI',
      presets: [presets.apis],
      spec: props.spec,
    });
  })
  return <div id="swaggerUI" style={{ flex: 1 }} />
}
