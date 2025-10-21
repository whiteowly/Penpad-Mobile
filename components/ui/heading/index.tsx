import React, { forwardRef, memo } from 'react';
import { H1, H2, H3, H4, H5, H6 } from '@expo/html-elements';
import { headingStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import type { StyleProp, TextStyle } from 'react-native';

const mergeFontStyle = (
  style: StyleProp<TextStyle> | undefined,
  fontFamily: string
): StyleProp<TextStyle> => {
  const base: TextStyle = { fontFamily };

  if (!style) {
    return base;
  }

  return Array.isArray(style)
    ? [base, ...style]
    : [base, style];
};

type IHeadingProps = VariantProps<typeof headingStyle> &
  React.ComponentPropsWithoutRef<typeof H1> & {
    as?: React.ElementType;
  };

cssInterop(H1, { className: 'style' });
cssInterop(H2, { className: 'style' });
cssInterop(H3, { className: 'style' });
cssInterop(H4, { className: 'style' });
cssInterop(H5, { className: 'style' });
cssInterop(H6, { className: 'style' });

const MappedHeading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(
    function MappedHeading(
      {
        size,
        className,
        isTruncated,
        bold,
        underline,
        strikeThrough,
        sub,
        italic,
        highlight,
        ...props
      },
      ref
    ) {
      const { style, ...restProps } = props;

      const computedClassName = headingStyle({
        size,
        isTruncated: isTruncated as boolean,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className,
      });

      const resolvedFontFamily =
        bold === false ? 'Poppins_500Medium' : 'Poppins_700Bold';

      const mergedStyle = mergeFontStyle(
        style as StyleProp<TextStyle>,
        resolvedFontFamily
      );

      switch (size) {
        case '5xl':
        case '4xl':
        case '3xl':
          return (
            <H1
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        case '2xl':
          return (
            <H2
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        case 'xl':
          return (
            <H3
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        case 'lg':
          return (
            <H4
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        case 'md':
          return (
            <H5
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        case 'sm':
        case 'xs':
          return (
            <H6
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
        default:
          return (
            <H4
              className={computedClassName}
              style={mergedStyle}
              {...restProps}
              // @ts-expect-error : type issue
              ref={ref}
            />
          );
      }
    }
  )
);

const Heading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(function Heading(
    { className, size = 'lg', as: AsComp, ...props },
    ref
  ) {
    const {
      isTruncated,
      bold,
      underline,
      strikeThrough,
      sub,
      italic,
      highlight,
      style,
      ...restProps
    } = props;

    const computedClassName = headingStyle({
      size,
      isTruncated: isTruncated as boolean,
      bold: bold as boolean,
      underline: underline as boolean,
      strikeThrough: strikeThrough as boolean,
      sub: sub as boolean,
      italic: italic as boolean,
      highlight: highlight as boolean,
      class: className,
    });

    const incomingStyle = style as StyleProp<TextStyle>;
    const resolvedFontFamily =
      bold === false ? 'Poppins_500Medium' : 'Poppins_700Bold';

    const mergedStyle = mergeFontStyle(incomingStyle, resolvedFontFamily);

    if (AsComp) {
      return (
        <AsComp
          className={computedClassName}
          style={mergedStyle}
          {...restProps}
        />
      );
    }

    return (
      <MappedHeading
        className={className}
        size={size}
        isTruncated={isTruncated}
        bold={bold}
        underline={underline}
        strikeThrough={strikeThrough}
        sub={sub}
        italic={italic}
        highlight={highlight}
        style={incomingStyle}
        ref={ref}
        {...restProps}
      />
    );
  })
);

Heading.displayName = 'Heading';

export { Heading };
