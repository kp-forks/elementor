import * as React from 'react';
import { useEffect, useState } from 'react';
import { PopoverContent, useBoundProp } from '@elementor/editor-controls';
import { useSuppressedMessage } from '@elementor/editor-current-user';
import { PopoverBody } from '@elementor/editor-editing-panel';
import { PopoverHeader } from '@elementor/editor-ui';
import { ArrowLeftIcon, BrushIcon, TrashIcon } from '@elementor/icons';
import { Button, CardActions, Divider, FormHelperText, IconButton } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { usePermissions } from '../hooks/use-permissions';
import { deleteVariable, updateVariable, useVariable } from '../hooks/use-prop-variables';
import { colorVariablePropTypeUtil } from '../prop-types/color-variable-prop-type';
import { styleVariablesRepository } from '../style-variables-repository';
import { ERROR_MESSAGES, mapServerError } from '../utils/validations';
import { ColorField } from './fields/color-field';
import { LabelField, useLabelError } from './fields/label-field';
import { DeleteConfirmationDialog } from './ui/delete-confirmation-dialog';
import { EDIT_CONFIRMATION_DIALOG_ID, EditConfirmationDialog } from './ui/edit-confirmation-dialog';

const SIZE = 'tiny';

type Props = {
	editId: string;
	onClose: () => void;
	onGoBack?: () => void;
	onSubmit?: () => void;
};

export const ColorVariableEdit = ( { onClose, onGoBack, onSubmit, editId }: Props ) => {
	const { setValue: notifyBoundPropChange, value: assignedValue } = useBoundProp( colorVariablePropTypeUtil );
	const [ isMessageSuppressed, suppressMessage ] = useSuppressedMessage( EDIT_CONFIRMATION_DIALOG_ID );
	const [ deleteConfirmation, setDeleteConfirmation ] = useState( false );
	const [ editConfirmation, setEditConfirmation ] = useState( false );
	const [ errorMessage, setErrorMessage ] = useState( '' );

	const { labelFieldError, setLabelFieldError } = useLabelError();

	const variable = useVariable( editId );
	if ( ! variable ) {
		throw new Error( `Global color variable not found` );
	}

	const userPermissions = usePermissions();

	const [ color, setColor ] = useState( variable.value );
	const [ label, setLabel ] = useState( variable.label );

	useEffect( () => {
		styleVariablesRepository.update( {
			[ editId ]: {
				...variable,
				value: color,
			},
		} );

		return () => {
			styleVariablesRepository.update( {
				[ editId ]: { ...variable },
			} );
		};
	}, [ editId, color, variable ] );

	const handleUpdate = () => {
		if ( isMessageSuppressed ) {
			handleSaveVariable();
		} else {
			setEditConfirmation( true );
		}
	};

	const handleSaveVariable = () => {
		updateVariable( editId, {
			value: color,
			label,
		} )
			.then( () => {
				maybeTriggerBoundPropChange();
				onSubmit?.();
			} )
			.catch( ( error ) => {
				const mappedError = mapServerError( error );
				if ( mappedError && 'label' === mappedError.field ) {
					setLabel( '' );
					setLabelFieldError( {
						value: label,
						message: mappedError.message,
					} );
					return;
				}

				setErrorMessage( ERROR_MESSAGES.UNEXPECTED_ERROR );
			} );
	};

	const handleDelete = () => {
		deleteVariable( editId ).then( () => {
			maybeTriggerBoundPropChange();
			onSubmit?.();
		} );
	};

	const maybeTriggerBoundPropChange = () => {
		if ( editId === assignedValue ) {
			notifyBoundPropChange( editId );
		}
	};

	const handleDeleteConfirmation = () => {
		setDeleteConfirmation( true );
	};

	const closeDeleteDialog = () => () => {
		setDeleteConfirmation( false );
	};

	const closeEditDialog = () => () => {
		setEditConfirmation( false );
	};

	const actions = [];

	if ( userPermissions.canDelete() ) {
		actions.push(
			<IconButton
				key="delete"
				size={ SIZE }
				aria-label={ __( 'Delete', 'elementor' ) }
				onClick={ handleDeleteConfirmation }
			>
				<TrashIcon fontSize={ SIZE } />
			</IconButton>
		);
	}

	const hasEmptyValues = () => {
		return ! color.trim() || ! label.trim();
	};

	const noValueChanged = () => {
		return color === variable.value && label === variable.label;
	};

	const hasErrors = () => {
		return !! errorMessage;
	};

	const isSubmitDisabled = noValueChanged() || hasEmptyValues() || hasErrors();

	return (
		<>
			<PopoverBody height="auto">
				<PopoverHeader
					title={ __( 'Edit variable', 'elementor' ) }
					onClose={ onClose }
					icon={
						<>
							{ onGoBack && (
								<IconButton
									size={ SIZE }
									aria-label={ __( 'Go Back', 'elementor' ) }
									onClick={ onGoBack }
								>
									<ArrowLeftIcon fontSize={ SIZE } />
								</IconButton>
							) }
							<BrushIcon fontSize={ SIZE } />
						</>
					}
					actions={ actions }
				/>

				<Divider />

				<PopoverContent p={ 2 }>
					<LabelField
						value={ label }
						error={ labelFieldError }
						onChange={ ( value ) => {
							setLabel( value );
							setErrorMessage( '' );
						} }
					/>
					<ColorField
						value={ color }
						onChange={ ( value ) => {
							setColor( value );
							setErrorMessage( '' );
						} }
					/>

					{ errorMessage && <FormHelperText error>{ errorMessage }</FormHelperText> }
				</PopoverContent>

				<CardActions sx={ { pt: 0.5, pb: 1 } }>
					<Button size="small" variant="contained" disabled={ isSubmitDisabled } onClick={ handleUpdate }>
						{ __( 'Save', 'elementor' ) }
					</Button>
				</CardActions>
			</PopoverBody>

			{ deleteConfirmation && (
				<DeleteConfirmationDialog
					open
					label={ label }
					onConfirm={ handleDelete }
					closeDialog={ closeDeleteDialog() }
				/>
			) }

			{ editConfirmation && ! isMessageSuppressed && (
				<EditConfirmationDialog
					closeDialog={ closeEditDialog() }
					onConfirm={ handleSaveVariable }
					onSuppressMessage={ suppressMessage }
				/>
			) }
		</>
	);
};
