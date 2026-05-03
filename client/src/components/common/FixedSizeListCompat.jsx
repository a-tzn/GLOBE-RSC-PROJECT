import { forwardRef } from 'react';
import { List } from 'react-window';

const CompatRow = ({ index, style, itemData, RowRenderer }) => {
  if (!RowRenderer) return null;
  return <RowRenderer index={index} style={style} data={itemData} />;
};

const FixedSizeListCompat = forwardRef(function FixedSizeListCompat(
  {
    children,
    itemCount,
    itemSize,
    itemData,
    height,
    width,
    overscanCount,
    style,
    ...rest
  },
  ref
) {
  return (
    <List
      {...rest}
      listRef={ref}
      rowComponent={CompatRow}
      rowCount={itemCount}
      rowHeight={itemSize}
      rowProps={{ itemData, RowRenderer: children }}
      overscanCount={overscanCount}
      defaultHeight={typeof height === 'number' ? height : undefined}
      style={{
        height,
        width,
        ...style
      }}
    />
  );
});

export default FixedSizeListCompat;
