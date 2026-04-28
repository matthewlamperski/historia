import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actionLabel: string;
  actionType: 'danger' | 'primary';
  onAction: (notes: string) => void;
  isLoading?: boolean;
  showNotesField?: boolean;
  notesLabel?: string;
  notesPlaceholder?: string;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  description,
  actionLabel,
  actionType,
  onAction,
  isLoading = false,
  showNotesField = true,
  notesLabel = 'Notes',
  notesPlaceholder = 'Add notes about this action...',
}: ActionModalProps) {
  const [notes, setNotes] = useState('');

  const handleAction = () => {
    onAction(notes);
    setNotes('');
  };

  const handleClose = () => {
    if (!isLoading) {
      setNotes('');
      onClose();
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                    actionType === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
                  }`}>
                    {actionType === 'danger' ? (
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {showNotesField && (
                  <div className="mt-4">
                    <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">
                      {notesLabel}
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="notes"
                        rows={3}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder={notesPlaceholder}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-start-2 ${
                      actionType === 'danger'
                        ? 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600'
                        : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleAction}
                  >
                    {isLoading ? 'Processing...' : actionLabel}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
