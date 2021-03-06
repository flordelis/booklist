import React, { FunctionComponent } from "react";
import SelectAvailableItems from "../AvailableTagsOrSubjects";
import { filterTags } from "app/state/tagsState";
import { useStackedSubjects } from "app/state/subjectsState";

type LocalProps = { currentlySelected: string[]; onSelect: any };

const SelectAvailableSubjects: FunctionComponent<LocalProps> = props => {
  const { subjectsUnwound } = useStackedSubjects();
  return (
    <SelectAvailableItems
      placeholder="Subjects"
      items={subjectsUnwound}
      currentlySelected={props.currentlySelected}
      onSelect={props.onSelect}
      filter={filterTags}
    />
  );
};

export default SelectAvailableSubjects;
