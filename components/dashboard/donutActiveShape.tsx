'use client'

import { Sector } from 'recharts'

type ActiveShapeProps = {
  index?: number
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  midAngle?: number
  fill?: string
}

export function renderDonutShape(props: ActiveShapeProps, active = false) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    midAngle = (startAngle + endAngle) / 2,
    fill = '#b150e2',
  } = props
  const distance = active ? 5 : 0
  const radians = (-midAngle * Math.PI) / 180
  const translateX = Math.cos(radians) * distance
  const translateY = Math.sin(radians) * distance

  return (
    <g
      style={{
        transform: `translate(${translateX}px, ${translateY}px)`,
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        filter: active ? 'drop-shadow(0 2px 6px rgba(29, 29, 31, 0.12))' : 'none',
      }}
    >
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={active ? outerRadius + 2 : outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={active ? 2 : 1}
      />
    </g>
  )
}
