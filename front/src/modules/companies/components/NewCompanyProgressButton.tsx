import { useCallback, useState } from 'react';
import { getOperationName } from '@apollo/client/utilities';
import { useRecoilState } from 'recoil';
import { v4 as uuidv4 } from 'uuid';

import { GET_PIPELINE_PROGRESS, GET_PIPELINES } from '@/pipeline/queries';
import { BoardColumnContext } from '@/pipeline/states/BoardColumnContext';
import { boardState } from '@/pipeline/states/boardState';
import { currentPipelineState } from '@/pipeline/states/currentPipelineState';
import { pipelineStageIdScopedState } from '@/pipeline/states/pipelineStageIdScopedState';
import { BoardPipelineStageColumn } from '@/ui/board/components/Board';
import { NewButton } from '@/ui/board/components/NewButton';
import { SingleEntitySelect } from '@/ui/input/relation-picker/components/SingleEntitySelect';
import { relationPickerSearchFilterScopedState } from '@/ui/input/relation-picker/states/relationPickerSearchFilterScopedState';
import { RelationPickerHotkeyScope } from '@/ui/input/relation-picker/types/RelationPickerHotkeyScope';
import { usePreviousHotkeyScope } from '@/ui/utilities/hotkey/hooks/usePreviousHotkeyScope';
import { useRecoilScopedState } from '@/ui/utilities/recoil-scope/hooks/useRecoilScopedState';
import { useCreateOneCompanyPipelineProgressMutation } from '~/generated/graphql';

import { useFilteredSearchCompanyQuery } from '../queries';

export function NewCompanyProgressButton() {
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [board, setBoard] = useRecoilState(boardState);
  const [pipeline] = useRecoilState(currentPipelineState);
  const [pipelineStageId] = useRecoilScopedState(
    pipelineStageIdScopedState,
    BoardColumnContext,
  );

  const {
    goBackToPreviousHotkeyScope,
    setHotkeyScopeAndMemorizePreviousScope,
  } = usePreviousHotkeyScope();

  const [createOneCompanyPipelineProgress] =
    useCreateOneCompanyPipelineProgressMutation({
      refetchQueries: [
        getOperationName(GET_PIPELINE_PROGRESS) ?? '',
        getOperationName(GET_PIPELINES) ?? '',
      ],
    });

  const handleEntitySelect = useCallback(
    async (company: any) => {
      if (!company) return;

      setIsCreatingCard(false);
      goBackToPreviousHotkeyScope();

      const newUuid = uuidv4();
      const newBoard = JSON.parse(JSON.stringify(board));
      const destinationColumnIndex = newBoard.findIndex(
        (column: BoardPipelineStageColumn) =>
          column.pipelineStageId === pipelineStageId,
      );
      newBoard[destinationColumnIndex].pipelineProgressIds.push(newUuid);
      setBoard(newBoard);
      await createOneCompanyPipelineProgress({
        variables: {
          uuid: newUuid,
          pipelineStageId: pipelineStageId || '',
          pipelineId: pipeline?.id || '',
          companyId: company.id || '',
        },
      });
    },
    [
      goBackToPreviousHotkeyScope,
      board,
      setBoard,
      createOneCompanyPipelineProgress,
      pipelineStageId,
      pipeline?.id,
    ],
  );

  const handleNewClick = useCallback(() => {
    setIsCreatingCard(true);
    setHotkeyScopeAndMemorizePreviousScope(
      RelationPickerHotkeyScope.RelationPicker,
    );
  }, [setIsCreatingCard, setHotkeyScopeAndMemorizePreviousScope]);

  function handleCancel() {
    goBackToPreviousHotkeyScope();
    setIsCreatingCard(false);
  }

  const [searchFilter] = useRecoilScopedState(
    relationPickerSearchFilterScopedState,
  );
  const companies = useFilteredSearchCompanyQuery({ searchFilter });

  return (
    <>
      {isCreatingCard ? (
        <SingleEntitySelect
          onEntitySelected={(value) => handleEntitySelect(value)}
          onCancel={handleCancel}
          entities={{
            entitiesToSelect: companies.entitiesToSelect,
            selectedEntity: companies.selectedEntities[0],
            loading: companies.loading,
          }}
          disableBackgroundBlur={true}
        />
      ) : (
        <NewButton onClick={handleNewClick} />
      )}
    </>
  );
}
