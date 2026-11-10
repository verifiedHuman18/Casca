import { Event } from './Event';
import { EventScope, EventStatus } from './event.enums';
import { EventProps, VisibilityContext } from './event.types';

export class SectionEvent extends Event {
  readonly scope = EventScope.SECTION;
  readonly targetSectionIds: string[];

  constructor(props: EventProps) {
    super(props);
    if (!props.targetSectionIds?.length)
      throw new Error('Section event requires at least one target section.');
    this.targetSectionIds = [...new Set(props.targetSectionIds)];
  }

  isVisibleTo({ viewer, extraSectionIds = [] }: VisibilityContext): boolean {
    if (this.status !== EventStatus.ACTIVE) return false;
    const visibleSections = new Set([viewer.sectionId, ...extraSectionIds].filter(Boolean));
    return this.targetSectionIds.some(id => visibleSections.has(id));
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), targetSectionIds: this.targetSectionIds };
  }
}
