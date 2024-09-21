import isEqual from 'lodash.isequal';
import React, { FC, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { MILLISECONDS_IN_DAY } from '../constants';
import { useBody } from '../context/BodyContext';
import { useTheme } from '../context/ThemeProvider';
import { OnEventResponse, PackedEvent, SizeAnimation } from '../types';

interface EventItemProps {
  event: PackedEvent;
  startUnix: number;
  renderEvent?: (event: PackedEvent, size: SizeAnimation) => React.ReactNode;
  onPressEvent?: (event: OnEventResponse) => void;
  onLongPressEvent?: (event: PackedEvent) => void;
  isDragging?: boolean;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
}

const EventItem: FC<EventItemProps> = ({
  event: eventInput,
  startUnix,
  renderEvent,
  onPressEvent,
  onLongPressEvent,
  isDragging,
  visibleDates,
}) => {
  const textStyle = useTheme((state) => state.textStyle);
  const {
    minuteHeight,
    columnWidthAnim,
    start,
    end,
    rightEdgeSpacing,
    overlapEventsSpacing,
  } = useBody();
  const { _internal, ...event } = eventInput;
  const {
    duration,
    startMinutes = 0,
    total,
    index,
    columnSpan,
    startUnix: eventStartUnix,
  } = _internal;

  const data = useMemo(() => {
    const maxDuration = end - start;
    let newStart = startMinutes - start;
    let totalDuration = Math.min(duration, maxDuration);
    if (newStart < 0) {
      totalDuration += newStart;
      newStart = 0;
    }

    let diffDays = Math.floor(
      (eventStartUnix - startUnix) / MILLISECONDS_IN_DAY
    );

    if (eventStartUnix < startUnix) {
      for (let i = eventStartUnix; i < startUnix; i += MILLISECONDS_IN_DAY) {
        if (!visibleDates[i]) {
          diffDays++;
        }
      }
    } else {
      for (let i = startUnix; i < eventStartUnix; i += MILLISECONDS_IN_DAY) {
        if (!visibleDates[i]) {
          diffDays--;
        }
      }
    }

    return {
      totalDuration,
      startMinutes: newStart,
      diffDays,
    };
  }, [
    duration,
    end,
    eventStartUnix,
    start,
    startMinutes,
    startUnix,
    visibleDates,
  ]);

  const eventHeight = useDerivedValue(
    () => data.totalDuration * minuteHeight.value,
    [data.totalDuration]
  );

  const eventWidth = useDerivedValue(() => {
    const totalColumns = total - columnSpan;
    const totalOverlap = totalColumns * overlapEventsSpacing;
    const totalWidth = columnWidthAnim.value - rightEdgeSpacing - totalOverlap;
    let width = (totalWidth / total) * columnSpan;

    return withTiming(width, { duration: 150 });
  }, [columnSpan, rightEdgeSpacing, overlapEventsSpacing, total]);

  const eventPosX = useDerivedValue(() => {
    let left = data.diffDays * columnWidthAnim.value;
    left += (eventWidth.value + overlapEventsSpacing) * index;
    return withTiming(left, { duration: 150 });
  }, [data.diffDays, overlapEventsSpacing, rightEdgeSpacing, index, total]);

  const top = useDerivedValue(() => {
    return data.startMinutes * minuteHeight.value;
  }, [data.startMinutes]);

  const animView = useAnimatedStyle(() => {
    return {
      height: eventHeight.value,
      width: eventWidth.value,
      left: eventPosX.value + 1,
      top: top.value,
    };
  });

  const _onPressEvent = () => {
    if (onPressEvent) {
      onPressEvent(eventInput);
    }
  };

  const _onLongPressEvent = () => {
    onLongPressEvent!(eventInput);
  };

  const opacity = isDragging ? 0.5 : 1;

  return (
    <Animated.View style={[styles.container, animView]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.6}
        disabled={!onPressEvent && !onLongPressEvent}
        onPress={onPressEvent ? _onPressEvent : undefined}
        onLongPress={onLongPressEvent ? _onLongPressEvent : undefined}
      >
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: event.color },
            event.containerStyle,
            { opacity },
          ]}
        >
          {renderEvent ? (
            renderEvent(eventInput, {
              width: eventWidth,
              height: eventHeight,
            })
          ) : (
            <Animated.Text
              style={[textStyle, styles.title, { color: event.titleColor }]}
            >
              {event.title}
            </Animated.Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(EventItem, (prev, next) => {
  return (
    isEqual(prev.event, next.event) &&
    isEqual(prev.visibleDates, next.visibleDates) &&
    prev.startUnix === next.startUnix &&
    prev.renderEvent === next.renderEvent &&
    prev.isDragging === next.isDragging &&
    prev.onPressEvent === next.onPressEvent &&
    prev.onLongPressEvent === next.onLongPressEvent
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', overflow: 'hidden' },
  title: { fontSize: 10 },
  contentContainer: { borderRadius: 2, width: '100%', height: '100%' },
});
